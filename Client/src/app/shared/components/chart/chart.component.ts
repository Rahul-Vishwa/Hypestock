  import { Component, input, AfterViewInit, signal, viewChild, ElementRef, OnChanges } from '@angular/core';
  import { AreaSeries, createChart, ColorType } from 'lightweight-charts';
  import { DataPoint } from '../../interface/interface';

  @Component({
    selector: 'app-chart',
    imports: [],
    templateUrl: './chart.component.html',
    styleUrl: './chart.component.css'
  })
  export class ChartComponent implements OnChanges, AfterViewInit {
    data = input.required<DataPoint[]>();
    newSeries = signal<any>(null);
    chartContainerRef = viewChild<ElementRef<HTMLDivElement>>('chartContainerRef');
    colors = signal({
      backgroundColor : '#0a0b0b',
      lineColor : '#2962FF',
      textColor : 'white',
      areaTopColor : '#2962FF',
      areaBottomColor : 'rgba(41, 98, 255, 0.28)'
    });

    ngOnChanges() {
      this.newSeries().setData(this.data());
    }

    ngAfterViewInit(): void {
      this.setupChart();
    }

    private setupChart() {
      const container = this.chartContainerRef()?.nativeElement;
      if (!container){
        return;
      }
      const chart = createChart(container, {
        layout: {
            background: { type: ColorType.Solid, color: this.colors().backgroundColor },
            textColor: this.colors().textColor,
        },
        width: container.clientWidth,
        height: 300,
        grid: {
          vertLines: {
            color: 'transparent',
          },
          horzLines: {
            color: 'transparent',
          },
        },
      });
      chart.timeScale().fitContent();
      chart.timeScale().applyOptions({
        timeVisible: true,
        secondsVisible: true,
      });

      this.newSeries.set(chart.addSeries(AreaSeries, { 
        lineColor: this.colors().lineColor, 
        topColor: this.colors().areaTopColor, 
        bottomColor: this.colors().areaBottomColor 
      }));
      this.newSeries().setData(this.data());
    }
  }
